import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/services/prisma.service';
import { AppLoggerService } from 'src/common/services/logger.service';
import { ApiResponse } from 'src/common/types';
import { throwError } from 'src/common/utils/helpers';
import { AddBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';
import { BeneficiarySelect, beneficiarySelect } from './queries';
import { GetAllBeneficiariesResponse } from './types';
import { User, BeneficiaryType, Prisma } from '@db';

@Injectable()
export class BeneficiaryService {
  private readonly logger = new AppLoggerService(BeneficiaryService.name);

  constructor(private readonly prismaService: PrismaService) {}

  async addBeneficiary(user: User, addBeneficiaryDto: AddBeneficiaryDto): Promise<ApiResponse<BeneficiarySelect>> {
    try {
      const beneficiary = await this.prismaService.beneficiary.create({
        data: {
          userId: user.id,
          ...addBeneficiaryDto,
        },
        select: beneficiarySelect,
      });

      this.logger.log(`Beneficiary added: ${beneficiary.id} for user: ${user.id}`);

      return {
        message: 'Beneficiary added successfully',
        success: true,
        data: beneficiary,
      };
    } catch (err) {
      this.logger.error('Failed to add beneficiary', err.stack, BeneficiaryService.name);
      throw throwError(err.message || 'Failed to add beneficiary', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getAllBeneficiaries(
    user: User,
    type?: BeneficiaryType,
    isFavorite?: boolean,
  ): Promise<ApiResponse<GetAllBeneficiariesResponse>> {
    try {
      const where: Prisma.BeneficiaryWhereInput = {
        userId: user.id,
        isActive: true,
      };

      if (type) where.beneficiaryType = type;
      if (isFavorite !== undefined) where.isFavorite = isFavorite;

      const [beneficiaries, totalCount] = await Promise.all([
        this.prismaService.beneficiary.findMany({
          where,
          select: beneficiarySelect,
          orderBy: [{ isFavorite: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prismaService.beneficiary.count({ where }),
      ]);

      return {
        message: 'Beneficiaries retrieved successfully',
        success: true,
        data: {
          beneficiaries,
          totalCount,
        },
      };
    } catch (err) {
      this.logger.error('Failed to retrieve beneficiaries', err.stack, BeneficiaryService.name);
      throw throwError(
        err.message || 'Failed to retrieve beneficiaries',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBeneficiaryById(user: User, beneficiaryId: string): Promise<ApiResponse<BeneficiarySelect>> {
    try {
      const beneficiary = await this.prismaService.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId: user.id,
        },
        select: beneficiarySelect,
      });

      if (!beneficiary) {
        throw throwError('Beneficiary not found', HttpStatus.NOT_FOUND);
      }

      return {
        message: 'Beneficiary retrieved successfully',
        success: true,
        data: beneficiary,
      };
    } catch (err) {
      this.logger.error('Failed to retrieve beneficiary', err.stack, BeneficiaryService.name);
      throw throwError(err.message || 'Failed to retrieve beneficiary', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async updateBeneficiary(
    user: User,
    beneficiaryId: string,
    updateBeneficiaryDto: UpdateBeneficiaryDto,
  ): Promise<ApiResponse<BeneficiarySelect>> {
    try {
      const existingBeneficiary = await this.prismaService.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId: user.id,
        },
      });

      if (!existingBeneficiary) {
        throw throwError('Beneficiary not found', HttpStatus.NOT_FOUND);
      }

      const beneficiary = await this.prismaService.beneficiary.update({
        where: { id: beneficiaryId },
        data: updateBeneficiaryDto,
        select: beneficiarySelect,
      });

      this.logger.log(`Beneficiary updated: ${beneficiaryId}`);

      return {
        message: 'Beneficiary updated successfully',
        success: true,
        data: beneficiary,
      };
    } catch (err) {
      this.logger.error('Failed to update beneficiary', err.stack, BeneficiaryService.name);
      throw throwError(err.message || 'Failed to update beneficiary', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteBeneficiary(user: User, beneficiaryId: string): Promise<ApiResponse<void>> {
    try {
      const beneficiary = await this.prismaService.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId: user.id,
        },
      });

      if (!beneficiary) {
        throw throwError('Beneficiary not found', HttpStatus.NOT_FOUND);
      }

      await this.prismaService.beneficiary.delete({
        where: { id: beneficiaryId },
      });

      this.logger.log(`Beneficiary deleted: ${beneficiaryId}`);

      return {
        message: 'Beneficiary deleted successfully',
        success: true,
        data: undefined,
      };
    } catch (err) {
      this.logger.error('Failed to delete beneficiary', err.stack, BeneficiaryService.name);
      throw throwError(err.message || 'Failed to delete beneficiary', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async toggleFavorite(user: User, beneficiaryId: string): Promise<ApiResponse<BeneficiarySelect>> {
    try {
      const beneficiary = await this.prismaService.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId: user.id,
        },
      });

      if (!beneficiary) {
        throw throwError('Beneficiary not found', HttpStatus.NOT_FOUND);
      }

      const updated = await this.prismaService.beneficiary.update({
        where: { id: beneficiaryId },
        data: { isFavorite: !beneficiary.isFavorite },
        select: beneficiarySelect,
      });

      this.logger.log(`Beneficiary favorite toggled: ${beneficiaryId}`);

      return {
        message: 'Beneficiary favorite status updated',
        success: true,
        data: updated,
      };
    } catch (err) {
      this.logger.error('Failed to toggle favorite', err.stack, BeneficiaryService.name);
      throw throwError(err.message || 'Failed to toggle favorite', err.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
