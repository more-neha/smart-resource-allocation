from database import SessionLocal, engine, Base
from models.problem import Problem
from models.volunteer import Volunteer
from models.user import User
from models.program import Program
from models.task import Task, TaskHistory

db = SessionLocal()

def clean_and_seed():
    print("Clearing old data...")
    # Clean up tasks and problems
    db.query(TaskHistory).delete()
    db.query(Task).delete()
    db.query(Problem).delete()
    db.query(Program).delete()
    
    # We will NOT delete Users and Volunteers so the authentication / accounts still work.
    
    print("Seeding fresh, meaningful data...")
    
    # Add meaningful programs
    p1 = Program(
        title="Pune Flood Relief Camp 2026",
        description="Providing immediate food, water, and medical aid to affected areas in low-lying Pune regions.",
        location="Pune, Maharashtra",
        date="2026-06-15",
        image_url="https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=2070"
    )
    p2 = Program(
        title="Community Fire Safety Workshop",
        description="Training local residents on fire safety, prevention, and first-response tactics in densely populated areas.",
        location="Mumbai, Maharashtra",
        date="2026-08-20",
        image_url="https://images.unsplash.com/photo-1543353071-087092ec393a?q=80&w=1974"
    )
    p3 = Program(
        title="Clean Drinking Water Initiative",
        description="Installing water purification systems in rural schools across the state to prevent waterborne diseases.",
        location="Rural Maharashtra",
        date="2026-09-10",
        image_url="https://images.unsplash.com/photo-1520697960334-08053f3e1b0b?q=80&w=2070"
    )
    db.add_all([p1, p2, p3])

    # Add a meaningful active problem
    prob1 = Problem(
        first_name="Rajesh",
        last_name="Kumar",
        phone="9876543210",
        type="flood",
        description="Heavy waterlogging in the basement of residential society. Needs water pumps and emergency food supplies for trapped elderly residents.",
        latitude=18.5204,
        longitude=73.8567,
        location_text="Shivajinagar, Pune",
        severity=4,
        people_affected=15,
        status="pending",
        verification_status="pending"
    )
    
    prob2 = Problem(
        first_name="Priya",
        last_name="Sharma",
        phone="9988776655",
        type="medical emergency",
        description="Accident on the main highway. 3 people injured. Require immediate medical trauma support until ambulance arrives.",
        latitude=19.0760,
        longitude=72.8777,
        location_text="Western Express Highway, Mumbai",
        severity=5,
        people_affected=3,
        status="pending",
        verification_status="pending"
    )

    db.add_all([prob1, prob2])
    db.commit()
    print("Database cleaned and seeded successfully!")

if __name__ == "__main__":
    clean_and_seed()
