-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "teacher_id" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "credits" INTEGER DEFAULT 0,
    "department" TEXT,
    "grade_level" TEXT,
    "prerequisites" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCourse" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Course_school_id_department_idx" ON "Course"("school_id", "department");

-- CreateIndex
CREATE INDEX "Course_school_id_grade_level_idx" ON "Course"("school_id", "grade_level");

-- CreateIndex
CREATE UNIQUE INDEX "Course_school_id_code_key" ON "Course"("school_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCourse_class_id_course_id_key" ON "ClassCourse"("class_id", "course_id");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCourse" ADD CONSTRAINT "ClassCourse_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCourse" ADD CONSTRAINT "ClassCourse_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
