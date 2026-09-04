import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { BudgetDto } from './budget.dto';
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Post('budget')
  @HttpCode(200)
  setBudget(@Body() dto: BudgetDto) {
    return this.campaigns.setBudget(dto);
  }
}
