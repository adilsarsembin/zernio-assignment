import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ZernioApiError } from '@zernio/node';
import { PrismaService } from '../prisma/prisma.service';
import { ZERNIO } from '../zernio/zernio.module';
import { CampaignsService } from './campaigns.service';

const owner = {
  id: '3f9c2a1e-6b7d-4c58-9a0e-1d2f3b4c5a6e',
  phoneNumber: '+972541234567',
  zernioAccountId: 'acc_metaads_9f3a',
  metaAdAccountId: 'act_88120031',
  facebookCampaignId: '23851234567890123',
};

describe('CampaignsService', () => {
  const db = { user: { findUnique: jest.fn().mockResolvedValue(owner) } };
  const zernio = { adcampaigns: { updateAdCampaign: jest.fn() } };
  let svc: CampaignsService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: db },
        { provide: ZERNIO, useValue: zernio },
      ],
    }).compile();
    svc = mod.get(CampaignsService);
  });

  it('throws 409 when budget lives on ad set level', async () => {
    zernio.adcampaigns.updateAdCampaign.mockRejectedValue(
      new ZernioApiError('Campaign is ABO', 409, 'BUDGET_LEVEL_MISMATCH'),
    );

    await expect(
      svc.setBudget({ phoneNumber: owner.phoneNumber, budgetAmount: 40 }),
    ).rejects.toThrow(ConflictException);

    expect(zernio.adcampaigns.updateAdCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        path: { campaignId: owner.facebookCampaignId },
        body: {
          platform: 'facebook',
          accountId: owner.zernioAccountId,
          budget: { amount: 40, type: 'daily' },
        },
      }),
    );
  });
});
