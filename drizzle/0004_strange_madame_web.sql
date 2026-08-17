CREATE TABLE `notification_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyUpdates` boolean NOT NULL DEFAULT true,
	`taskUpdates` boolean NOT NULL DEFAULT true,
	`urgentTasks` boolean NOT NULL DEFAULT true,
	`evidenceEvents` boolean NOT NULL DEFAULT false,
	`expenseReview` boolean NOT NULL DEFAULT true,
	`expenseDecisions` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notification_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_preferences_owner_unique` UNIQUE(`ownerId`)
);
--> statement-breakpoint
CREATE TABLE `user_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`propertyId` int,
	`category` enum('property','task','evidence','expense','system') NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`entityId` int,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`readAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notification_preferences` ADD CONSTRAINT `notification_preferences_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_notifications` ADD CONSTRAINT `user_notifications_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_owner_read_created_idx` ON `user_notifications` (`ownerId`,`readAt`,`createdAt`);--> statement-breakpoint
CREATE INDEX `notifications_owner_created_idx` ON `user_notifications` (`ownerId`,`createdAt`);