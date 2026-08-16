CREATE TABLE `expense_decision_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`expenseId` int NOT NULL,
	`status` enum('approved','rejected') NOT NULL,
	`nonce` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `expense_decision_challenges_id` PRIMARY KEY(`id`),
	CONSTRAINT `expense_challenge_nonce_unique` UNIQUE(`nonce`)
);
--> statement-breakpoint
ALTER TABLE `expense_decision_challenges` ADD CONSTRAINT `expense_decision_challenges_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_decision_challenges` ADD CONSTRAINT `expense_decision_challenges_expenseId_property_expenses_id_fk` FOREIGN KEY (`expenseId`) REFERENCES `property_expenses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `expense_challenge_owner_expense_idx` ON `expense_decision_challenges` (`ownerId`,`expenseId`);