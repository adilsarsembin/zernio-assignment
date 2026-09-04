import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Zernio } from '@zernio/node';
import { PrismaService } from '../prisma/prisma.service';
import { ZERNIO } from '../zernio/zernio.module';
import { BudgetDto } from './budget.dto';

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(ZERNIO) private readonly zernio: Zernio,
  ) {}

  async setBudget({ phoneNumber, budgetAmount }: BudgetDto) {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.facebookCampaignId) {
      throw new ConflictException('User has no campaign yet');
    }

    const { data } = await this.zernio.adcampaigns.updateAdCampaign({
      path: { campaignId: user.facebookCampaignId },
      body: {
        platform: 'facebook',
        accountId: user.zernioAccountId,
        budget: { amount: budgetAmount, type: 'daily' },
      },
    });

    return { campaignId: user.facebookCampaignId, ...data };
  }
}
