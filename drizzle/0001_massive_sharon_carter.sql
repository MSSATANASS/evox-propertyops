CREATE TABLE `activity_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`actorId` int NOT NULL,
	`propertyId` int NOT NULL,
	`entityType` enum('property','task','evidence','expense') NOT NULL,
	`entityId` int NOT NULL,
	`action` varchar(120) NOT NULL,
	`metadata` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`address` text NOT NULL,
	`propertyType` varchar(80) NOT NULL,
	`status` enum('active','maintenance','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`taskId` int,
	`description` varchar(240) NOT NULL,
	`amountCents` int NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`decisionByUserId` int,
	`decidedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('todo','in_progress','blocked','done') NOT NULL DEFAULT 'todo',
	`dueAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `property_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_evidence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`taskId` int NOT NULL,
	`type` enum('note','photo','document') NOT NULL,
	`description` text NOT NULL,
	`fileUrl` varchar(2048),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_expenses` ADD CONSTRAINT `property_expenses_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_expenses` ADD CONSTRAINT `property_expenses_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_expenses` ADD CONSTRAINT `property_expenses_taskId_property_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `property_tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_expenses` ADD CONSTRAINT `property_expenses_decisionByUserId_users_id_fk` FOREIGN KEY (`decisionByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_tasks` ADD CONSTRAINT `property_tasks_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_tasks` ADD CONSTRAINT `property_tasks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_evidence` ADD CONSTRAINT `task_evidence_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_evidence` ADD CONSTRAINT `task_evidence_taskId_property_tasks_id_fk` FOREIGN KEY (`taskId`) REFERENCES `property_tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `events_owner_property_created_idx` ON `activity_events` (`ownerId`,`propertyId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `properties_owner_updated_idx` ON `properties` (`ownerId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `expenses_owner_property_idx` ON `property_expenses` (`ownerId`,`propertyId`);--> statement-breakpoint
CREATE INDEX `expenses_owner_status_idx` ON `property_expenses` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `tasks_owner_property_idx` ON `property_tasks` (`ownerId`,`propertyId`);--> statement-breakpoint
CREATE INDEX `tasks_owner_status_idx` ON `property_tasks` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `evidence_owner_task_idx` ON `task_evidence` (`ownerId`,`taskId`);