import { IsInt, Matches, Min } from 'class-validator';

export class BudgetDto {
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phoneNumber must be E.164' })
  phoneNumber: string;

  @IsInt()
  @Min(1)
  budgetAmount: number;
}
