-- DropForeignKey
ALTER TABLE "sync_checkpoints" DROP CONSTRAINT "sync_checkpoints_user_id_fkey";

-- DropTable
DROP TABLE "sync_checkpoints";

