-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "class_id" TEXT,
    "course_id" TEXT,
    "teacher_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'exam',
    "total_points" DOUBLE PRECISION NOT NULL,
    "passing_score" DOUBLE PRECISION,
    "due_date" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "instructions" TEXT,
    "grading_criteria" JSONB,
    "allow_late" BOOLEAN NOT NULL DEFAULT false,
    "late_penalty" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION DEFAULT 1.0,
    "term_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "class_id" TEXT,
    "course_id" TEXT,
    "term_id" TEXT,
    "points_earned" DOUBLE PRECISION NOT NULL,
    "points_possible" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "letter_grade" TEXT,
    "status" TEXT NOT NULL DEFAULT 'final',
    "graded_by" TEXT NOT NULL,
    "graded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feedback" TEXT,
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "late_penalty" DOUBLE PRECISION,
    "extra_credit" DOUBLE PRECISION DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB,
    "file_urls" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submission_type" TEXT NOT NULL DEFAULT 'online',
    "attempt_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "schoolId" TEXT,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingPeriod" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "term_id" TEXT,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Assessment_school_id_class_id_idx" ON "Assessment"("school_id", "class_id");

-- CreateIndex
CREATE INDEX "Assessment_school_id_course_id_idx" ON "Assessment"("school_id", "course_id");

-- CreateIndex
CREATE INDEX "Assessment_teacher_id_idx" ON "Assessment"("teacher_id");

-- CreateIndex
CREATE INDEX "Assessment_term_id_idx" ON "Assessment"("term_id");

-- CreateIndex
CREATE INDEX "Grade_student_id_term_id_idx" ON "Grade"("student_id", "term_id");

-- CreateIndex
CREATE INDEX "Grade_class_id_term_id_idx" ON "Grade"("class_id", "term_id");

-- CreateIndex
CREATE INDEX "Grade_course_id_term_id_idx" ON "Grade"("course_id", "term_id");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_student_id_assessment_id_key" ON "Grade"("student_id", "assessment_id");

-- CreateIndex
CREATE INDEX "Submission_assessment_id_idx" ON "Submission"("assessment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_student_id_assessment_id_attempt_number_key" ON "Submission"("student_id", "assessment_id", "attempt_number");

-- CreateIndex
CREATE INDEX "GradingPeriod_school_id_is_current_idx" ON "GradingPeriod"("school_id", "is_current");

-- CreateIndex
CREATE UNIQUE INDEX "GradingPeriod_school_id_name_term_id_key" ON "GradingPeriod"("school_id", "name", "term_id");

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriod" ADD CONSTRAINT "GradingPeriod_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradingPeriod" ADD CONSTRAINT "GradingPeriod_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;
