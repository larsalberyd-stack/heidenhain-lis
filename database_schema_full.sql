-- ============================================================================
-- Heidenhain Lead Intelligence - Complete Database Schema
-- Generated from Drizzle ORM migrations
-- Database: MySQL / TiDB Serverless
-- ============================================================================

-- Migration 0000: Initial users table
CREATE TABLE `users` (
`id` int AUTO_INCREMENT NOT NULL,
`openId` varchar(64) NOT NULL,
`name` text,
`email` varchar(320),
`loginMethod` varchar(64),
`role` enum('user','admin') NOT NULL DEFAULT 'user',
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `users_id` PRIMARY KEY(`id`),
CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);

-- Migration 0001: Core business tables
CREATE TABLE `activities` (
`id` int AUTO_INCREMENT NOT NULL,
`companyId` int NOT NULL,
`contactId` int,
`type` enum('email_sent','email_opened','email_replied','meeting_booked','call','note') NOT NULL,
`description` text,
`performedBy` varchar(255),
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `activities_id` PRIMARY KEY(`id`)
);

CREATE TABLE `companies` (
`id` int AUTO_INCREMENT NOT NULL,
`name` varchar(255) NOT NULL,
`domain` varchar(255),
`category` varchar(255),
`focus` varchar(10),
`source` varchar(100),
`city` varchar(100),
`country` varchar(100),
`description` text,
`industry` varchar(255),
`employeeCount` int,
`employeeRange` varchar(50),
`linkedinUrl` varchar(500),
`websiteUrl` varchar(500),
`logoUrl` varchar(500),
`foundedYear` int,
`status` enum('new','contacted','meeting','qualified','lost') NOT NULL DEFAULT 'new',
`assignedTo` varchar(255),
`notes` text,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
`enrichedAt` timestamp,
CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);

CREATE TABLE `contacts` (
`id` int AUTO_INCREMENT NOT NULL,
`companyId` int NOT NULL,
`firstName` varchar(100),
`lastName` varchar(100),
`fullName` varchar(255),
`title` varchar(255),
`seniority` varchar(100),
`department` varchar(100),
`email` varchar(320),
`emailVerified` boolean DEFAULT false,
`phone` varchar(50),
`linkedinUrl` varchar(500),
`location` varchar(255),
`priority` enum('high','medium','low') DEFAULT 'medium',
`notes` text,
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `generated_emails` (
`id` int AUTO_INCREMENT NOT NULL,
`companyId` int NOT NULL,
`contactId` int,
`subject` text NOT NULL,
`body` text NOT NULL,
`editedBody` text,
`contactName` varchar(255),
`contactTitle` varchar(255),
`companyName` varchar(255),
`companyCategory` varchar(255),
`companyFocus` varchar(10),
`status` enum('draft','sent','opened','replied') DEFAULT 'draft',
`generatedBy` varchar(255),
`createdAt` timestamp NOT NULL DEFAULT (now()),
`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
CONSTRAINT `generated_emails_id` PRIMARY KEY(`id`)
);

CREATE TABLE `webhook_logs` (
`id` int AUTO_INCREMENT NOT NULL,
`source` varchar(50) DEFAULT 'clay',
`payload` text,
`status` enum('success','error','partial') DEFAULT 'success',
`errorMessage` text,
`companiesCreated` int DEFAULT 0,
`contactsCreated` int DEFAULT 0,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `webhook_logs_id` PRIMARY KEY(`id`)
);

-- Migration 0002: Weekly assignments and company assignment fields
CREATE TABLE `weekly_assignments` (
`id` int AUTO_INCREMENT NOT NULL,
`assignedToUserId` int NOT NULL,
`assignedToName` varchar(255),
`weekLabel` varchar(50) NOT NULL,
`createdByUserId` int NOT NULL,
`createdAt` timestamp NOT NULL DEFAULT (now()),
CONSTRAINT `weekly_assignments_id` PRIMARY KEY(`id`)
);

ALTER TABLE `companies` ADD `assignedToUserId` int;
ALTER TABLE `companies` ADD `assignedToName` varchar(255);
ALTER TABLE `companies` ADD `weeklyListId` int;
