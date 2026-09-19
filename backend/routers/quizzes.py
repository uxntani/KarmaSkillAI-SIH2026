from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db

from models import (
    Quiz,
    QuizQuestion,
    Competency,
    Employee,
    QuizAttempt,
    Assessment
)

from schemas import QuizAttemptCreate
from services.assessment_engine import update_employee_competency


router = APIRouter(
    prefix="/quizzes",
    tags=["Quizzes"]
)


# =========================================================
# SCHEMAS (inline for quiz update)
# =========================================================

class QuizQuestionUpdate(BaseModel):
    id: Optional[int] = None
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    difficulty: Optional[str] = None
    explanation: Optional[str] = None
    competency_id: Optional[int] = None

class QuizUpdate(BaseModel):
    title: str
    questions: List[QuizQuestionUpdate]


# =========================================================
# LIST QUIZZES
# =========================================================

@router.get("/")
def get_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(Quiz).all()

    result = []
    for quiz in quizzes:
        first_q = db.query(QuizQuestion).filter(
            QuizQuestion.quiz_id == quiz.id
        ).first()

        competency_name = None
        if first_q and first_q.competency:
            competency_name = first_q.competency.name

        result.append({
            "id": quiz.id,
            "title": quiz.title,
            "material_id": quiz.material_id,
            "material_title": quiz.material.title if quiz.material else None,
            "number_of_questions": quiz.number_of_questions,
            "competency": competency_name
        })

    return result


# =========================================================
# GET QUIZ
# =========================================================

@router.get("/{quiz_id}")
def get_quiz(
    quiz_id: int,
    db: Session = Depends(get_db)
):

    quiz = (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id)
        .first()
    )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found"
        )

    questions = (
        db.query(QuizQuestion)
        .filter(
            QuizQuestion.quiz_id == quiz_id
        )
        .all()
    )

    return {
        "id": quiz.id,
        "title": quiz.title,
        "number_of_questions": len(questions),

        "questions": [
            {
                "id": question.id,
                "question": question.question,

                "options": {
                    "A": question.option_a,
                    "B": question.option_b,
                    "C": question.option_c,
                    "D": question.option_d
                },

                "difficulty": question.difficulty
            }

            for question in questions
        ]
    }


# =========================================================
# UPDATE QUIZ (title + questions)
# =========================================================

@router.put("/{quiz_id}")
def update_quiz(
    quiz_id: int,
    update_data: QuizUpdate,
    db: Session = Depends(get_db)
):
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()

    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    # Update title
    quiz.title = update_data.title.strip()

    # Replace questions
    db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).delete()
    db.flush()

    for q in update_data.questions:
        # Resolve competency_id from name if needed (passed as int already)
        new_q = QuizQuestion(
            quiz_id=quiz_id,
            question=q.question,
            option_a=q.option_a,
            option_b=q.option_b,
            option_c=q.option_c,
            option_d=q.option_d,
            correct_answer=q.correct_answer.upper(),
            difficulty=q.difficulty,
            explanation=q.explanation,
            competency_id=q.competency_id
        )
        db.add(new_q)

    quiz.number_of_questions = len(update_data.questions)
    db.commit()
    db.refresh(quiz)

    return {
        "message": "Quiz updated successfully",
        "id": quiz.id,
        "title": quiz.title,
        "number_of_questions": quiz.number_of_questions
    }


# =========================================================
# CHECK IF EMPLOYEE ALREADY ATTEMPTED A QUIZ
# =========================================================

@router.get("/{quiz_id}/attempt/{employee_id}")
def get_employee_quiz_attempt(
    quiz_id: int,
    employee_id: int,
    db: Session = Depends(get_db)
):
    attempt = (
        db.query(QuizAttempt)
        .filter(
            QuizAttempt.quiz_id == quiz_id,
            QuizAttempt.employee_id == employee_id
        )
        .order_by(QuizAttempt.id.desc())
        .first()
    )

    if not attempt:
        return {"attempted": False, "attempt": None}

    return {
        "attempted": True,
        "attempt": {
            "id": attempt.id,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage
        }
    }


# =========================================================
# SUBMIT QUIZ
# =========================================================

@router.post("/{quiz_id}/attempt")
def submit_quiz(
    quiz_id: int,
    attempt_data: QuizAttemptCreate,
    db: Session = Depends(get_db)
):

    # -----------------------------------------------------
    # 1. Check quiz

    # -----------------------------------------------------

    quiz = (
        db.query(Quiz)
        .filter(Quiz.id == quiz_id)
        .first()
    )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found"
        )


    # -----------------------------------------------------
    # 2. Check employee
    # -----------------------------------------------------

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == attempt_data.employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )


    # -----------------------------------------------------
    # 3. Get questions
    # -----------------------------------------------------

    questions = (
        db.query(QuizQuestion)
        .filter(
            QuizQuestion.quiz_id == quiz_id
        )
        .all()
    )

    if not questions:
        raise HTTPException(
            status_code=400,
            detail="Quiz has no questions"
        )


    # -----------------------------------------------------
    # 4. Create answer lookup
    # -----------------------------------------------------

    submitted_answers = {
        answer.question_id: answer.answer.upper()
        for answer in attempt_data.answers
    }


    # -----------------------------------------------------
    # 5. Check answers
    # -----------------------------------------------------

    score = 0

    results = []

    for question in questions:

        user_answer = submitted_answers.get(
            question.id
        )

        is_correct = (
            user_answer == question.correct_answer.upper()
        )

        if is_correct:
            score += 1

        results.append({
            "question_id": question.id,
            "your_answer": user_answer,
            "correct": is_correct
        })


    # -----------------------------------------------------
    # 6. Calculate percentage
    # -----------------------------------------------------

    total_questions = len(questions)

    percentage = (
        score / total_questions
    ) * 100


    # -----------------------------------------------------
    # 7. Find competency
    # -----------------------------------------------------

    competency_id = None

    for question in questions:

        if question.competency_id:
            competency_id = question.competency_id
            break


    # -----------------------------------------------------
    # 8. Save QuizAttempt
    # -----------------------------------------------------

    quiz_attempt = QuizAttempt(
        quiz_id=quiz_id,
        employee_id=employee.id,
        score=score,
        total_questions=total_questions,
        percentage=round(percentage, 2)
    )

    db.add(quiz_attempt)
    db.commit()
    db.refresh(quiz_attempt)


    # -----------------------------------------------------
    # 9. Create Assessment
    # -----------------------------------------------------

    assessment = None

    if competency_id:

        assessment = Assessment(
            employee_id=employee.id,
            competency_id=competency_id,
            score=score,
            total_questions=total_questions,
            percentage=round(percentage, 2)
        )

        db.add(assessment)
        db.commit()
        db.refresh(assessment)


        # -------------------------------------------------
        # 10. Update employee competency
        # -------------------------------------------------

        update_employee_competency(
            employee.id,
            competency_id,
            db
        )


    # -----------------------------------------------------
    # 11. Return result
    # -----------------------------------------------------

    return {
        "message": "Quiz submitted successfully",

        "employee": {
            "id": employee.id,
            "name": employee.name
        },

        "quiz": {
            "id": quiz.id,
            "title": quiz.title
        },

        "result": {
            "score": score,
            "total_questions": total_questions,
            "percentage": round(percentage, 2)
        },

        "question_results": results,

        "assessment_created": (
            assessment is not None
        ),

        "competency_id": competency_id
    }