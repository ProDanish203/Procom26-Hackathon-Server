import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiProperty,
  ApiQuery,
  ApiTags,
  ApiParam,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User, UserRole, BeneficiaryType } from '@db';
import { ApiResponse } from 'src/common/types';
import { BeneficiaryService } from './beneficiary.service';
import { AddBeneficiaryDto, UpdateBeneficiaryDto } from './dto/beneficiary.dto';
import { BeneficiarySelect } from './queries';
import { GetAllBeneficiariesResponse } from './types';
import { RedisService } from 'src/common/services/redis.service';

@Controller('beneficiary')
@ApiTags('Beneficiary Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class BeneficiaryController {
  private readonly CACHE_TTL = 300;

  constructor(
    private readonly beneficiaryService: BeneficiaryService,
    private readonly redisService: RedisService,
  ) {}

  private getCacheKey(userId: string, prefix: string, ...params: (string | number | boolean | undefined)[]): string {
    const keyParts = params.filter((p) => p !== undefined && p !== null && p !== '');
    return `beneficiary:${userId}:${prefix}:${keyParts.join(':')}`;
  }

  private async invalidateBeneficiaryCache(userId: string): Promise<void> {
    const keysToDelete = [this.getCacheKey(userId, 'all'), this.getCacheKey(userId, 'favorites')];
    await this.redisService.deleteMany(keysToDelete);
  }

  @Roles(...Object.values(UserRole))
  @Post()
  @ApiProperty({
    title: 'Add Beneficiary',
    description: 'Add a new beneficiary for transfers or payments',
    type: AddBeneficiaryDto,
  })
  @SwaggerResponse({ status: 201, description: 'Beneficiary added successfully' })
  @SwaggerResponse({ status: 400, description: 'Bad request - Invalid data' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async addBeneficiary(
    @CurrentUser() user: User,
    @Body() addBeneficiaryDto: AddBeneficiaryDto,
  ): Promise<ApiResponse<BeneficiarySelect>> {
    const response = await this.beneficiaryService.addBeneficiary(user, addBeneficiaryDto);
    await this.invalidateBeneficiaryCache(user.id);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get()
  @ApiProperty({ title: 'Get All Beneficiaries', description: 'Get all beneficiaries for the current user' })
  @ApiQuery({ name: 'type', enum: BeneficiaryType, required: false, description: 'Filter by beneficiary type' })
  @ApiQuery({ name: 'isFavorite', type: Boolean, required: false, description: 'Filter by favorite status' })
  @SwaggerResponse({ status: 200, description: 'Beneficiaries retrieved successfully' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getAllBeneficiaries(
    @CurrentUser() user: User,
    @Query('type') type?: BeneficiaryType,
    @Query('isFavorite') isFavorite?: boolean,
  ): Promise<ApiResponse<GetAllBeneficiariesResponse>> {
    const cacheKey = this.getCacheKey(user.id, 'all', type, isFavorite);

    const cached = await this.redisService.get<ApiResponse<GetAllBeneficiariesResponse>>(cacheKey);
    if (cached) return cached;

    const response = await this.beneficiaryService.getAllBeneficiaries(user, type, isFavorite);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Get(':id')
  @ApiProperty({ title: 'Get Beneficiary Details', description: 'Get details of a specific beneficiary' })
  @ApiParam({ name: 'id', type: String, description: 'Beneficiary ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Beneficiary retrieved successfully' })
  @SwaggerResponse({ status: 404, description: 'Beneficiary not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async getBeneficiaryById(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ApiResponse<BeneficiarySelect>> {
    const cacheKey = this.getCacheKey(user.id, 'detail', id);

    const cached = await this.redisService.get<ApiResponse<BeneficiarySelect>>(cacheKey);
    if (cached) return cached;

    const response = await this.beneficiaryService.getBeneficiaryById(user, id);
    await this.redisService.set(cacheKey, response, this.CACHE_TTL);

    return response;
  }

  @Roles(...Object.values(UserRole))
  @Put(':id')
  @ApiProperty({ title: 'Update Beneficiary', description: 'Update beneficiary details', type: UpdateBeneficiaryDto })
  @ApiParam({ name: 'id', type: String, description: 'Beneficiary ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Beneficiary updated successfully' })
  @SwaggerResponse({ status: 404, description: 'Beneficiary not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async updateBeneficiary(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() updateBeneficiaryDto: UpdateBeneficiaryDto,
  ): Promise<ApiResponse<BeneficiarySelect>> {
    const response = await this.beneficiaryService.updateBeneficiary(user, id, updateBeneficiaryDto);
    await this.invalidateBeneficiaryCache(user.id);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Delete(':id')
  @ApiProperty({ title: 'Delete Beneficiary', description: 'Delete a beneficiary' })
  @ApiParam({ name: 'id', type: String, description: 'Beneficiary ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Beneficiary deleted successfully' })
  @SwaggerResponse({ status: 404, description: 'Beneficiary not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async deleteBeneficiary(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<void>> {
    const response = await this.beneficiaryService.deleteBeneficiary(user, id);
    await this.invalidateBeneficiaryCache(user.id);
    return response;
  }

  @Roles(...Object.values(UserRole))
  @Patch(':id/favorite')
  @ApiProperty({ title: 'Toggle Favorite', description: 'Toggle beneficiary favorite status' })
  @ApiParam({ name: 'id', type: String, description: 'Beneficiary ID (UUID)' })
  @SwaggerResponse({ status: 200, description: 'Favorite status updated successfully' })
  @SwaggerResponse({ status: 404, description: 'Beneficiary not found or does not belong to user' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized - Invalid or missing token' })
  async toggleFavorite(@CurrentUser() user: User, @Param('id') id: string): Promise<ApiResponse<BeneficiarySelect>> {
    const response = await this.beneficiaryService.toggleFavorite(user, id);
    await this.invalidateBeneficiaryCache(user.id);
    return response;
  }
}
