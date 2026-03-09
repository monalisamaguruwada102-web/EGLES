-- Egles SMIS Database Schema

CREATE TABLE IF NOT EXISTS "students" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100) UNIQUE,
    "name" VARCHAR(255),
    "class" VARCHAR(100),
    "gender" VARCHAR(50),
    "parentContact" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "attendance" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "date" VARCHAR(100),
    "status" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "fees" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "amount" DECIMAL(10,2),
    "date" VARCHAR(100),
    "type" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "marks" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "subject" VARCHAR(100),
    "score" INTEGER,
    "term" VARCHAR(100),
    "year" INTEGER
);

CREATE TABLE IF NOT EXISTS "staff" (
    id SERIAL PRIMARY KEY,
    "staffId" VARCHAR(100) UNIQUE,
    "name" VARCHAR(255),
    "role" VARCHAR(100),
    "contact" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "subjects" (
    id SERIAL PRIMARY KEY,
    "name" VARCHAR(255),
    "class" VARCHAR(100),
    "teacherId" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "assets" (
    id SERIAL PRIMARY KEY,
    "name" VARCHAR(255),
    "quantity" INTEGER,
    "condition" VARCHAR(100),
    "value" DECIMAL(10,2),
    "purchaseDate" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "timetable" (
    id SERIAL PRIMARY KEY,
    "class" VARCHAR(100),
    "day" VARCHAR(100),
    "period" VARCHAR(100),
    "subject" VARCHAR(255),
    "teacherId" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "library" (
    id SERIAL PRIMARY KEY,
    "title" VARCHAR(255),
    "ISBN" VARCHAR(100),
    "author" VARCHAR(255),
    "quantity" INTEGER,
    "available" INTEGER
);

CREATE TABLE IF NOT EXISTS "bookLoans" (
    id SERIAL PRIMARY KEY,
    "bookId" INTEGER,
    "studentId" VARCHAR(100),
    "loanDate" VARCHAR(100),
    "returnDate" VARCHAR(100),
    "status" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "discipline" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "infraction" TEXT,
    "date" VARCHAR(100),
    "action" TEXT,
    "severity" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "health" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "bloodGroup" VARCHAR(50),
    "allergies" TEXT,
    "emergencyContact" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "payroll" (
    id SERIAL PRIMARY KEY,
    "staffId" VARCHAR(100),
    "month" VARCHAR(50),
    "year" INTEGER,
    "salary" DECIMAL(10,2),
    "bonus" DECIMAL(10,2),
    "deductions" DECIMAL(10,2),
    "status" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "pos" (
    id SERIAL PRIMARY KEY,
    "itemName" VARCHAR(255),
    "price" DECIMAL(10,2),
    "quantity" INTEGER,
    "date" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "expenses" (
    id SERIAL PRIMARY KEY,
    "name" VARCHAR(255),
    "amount" DECIMAL(10,2),
    "category" VARCHAR(100),
    "date" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "notices" (
    id SERIAL PRIMARY KEY,
    "title" VARCHAR(255),
    "content" TEXT,
    "date" VARCHAR(100),
    "expiry" VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS "hostels" (
    id SERIAL PRIMARY KEY,
    "name" VARCHAR(255),
    "capacity" INTEGER,
    "gender" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "hostelAssignments" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "hostelId" INTEGER,
    "roomNo" VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "transport" (
    id SERIAL PRIMARY KEY,
    "route" VARCHAR(255),
    "busNo" VARCHAR(100),
    "driver" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "transportAssignments" (
    id SERIAL PRIMARY KEY,
    "studentId" VARCHAR(100),
    "routeId" INTEGER
);

CREATE TABLE IF NOT EXISTS "notifications" (
    id SERIAL PRIMARY KEY,
    "title" VARCHAR(255),
    "message" TEXT,
    "date" VARCHAR(100),
    "type" VARCHAR(100),
    "read" INTEGER
);

CREATE TABLE IF NOT EXISTS "users" (
    id SERIAL PRIMARY KEY,
    "username" VARCHAR(255) UNIQUE,
    "password" VARCHAR(255),
    "role" VARCHAR(100),
    "name" VARCHAR(255)
);
