-- AlterTable
ALTER TABLE "payroll_statutory_settings" ADD COLUMN     "basic_ratio" DECIMAL DEFAULT 0.5555,
ADD COLUMN     "conveyance_amount" DECIMAL DEFAULT 1500,
ADD COLUMN     "fixed_insurance_deduction" DECIMAL DEFAULT 334,
ADD COLUMN     "fixed_pf_deduction" DECIMAL DEFAULT 1500,
ADD COLUMN     "fixed_ptax_deduction" DECIMAL DEFAULT 200,
ADD COLUMN     "hra_ratio" DECIMAL DEFAULT 0.5;
