import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangeCrossDomainPasswordDto } from './dto/change-cross-domain-password.dto';
import { CreateCrossDomainUserDto } from './dto/create-cross-domain-user.dto';
import { CrossDomainApiKeyGuard } from './guards/cross-domain-api-key.guard';

@UseGuards(CrossDomainApiKeyGuard)
@Controller('cross-domain/users')
export class CrossDomainController {
  constructor(private readonly usersService: UsersService) {}

  // GET /cross-domain/users?page=1&limit=10&search=
  @Get()
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
  ) {
    const { users, total } = await this.usersService.findAll({
      page: Math.max(parseInt(page) || 1, 1),
      limit: Math.min(parseInt(limit) || 10, 100),
      search,
    });
    return {
      success: true,
      data: {
        users,
        total,
        page: Math.max(parseInt(page) || 1, 1),
        totalPages: Math.ceil(total / Math.min(parseInt(limit) || 10, 100)),
      },
    };
  }

  // POST /cross-domain/users
  @Post()
  async createUser(@Body() dto: CreateCrossDomainUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      emailVerified: true, // skip OTP on login — cross-domain users are pre-verified
    });
    const { passwordHash: _, ...result } = user;
    return { success: true, data: result };
  }

  // DELETE /cross-domain/users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    await this.usersService.deleteById(id);
    return { success: true, message: 'User deleted successfully.' };
  }

  // PATCH /cross-domain/users/:id/change-password
  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeCrossDomainPasswordDto,
  ) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.usersService.updatePassword(id, passwordHash);
    return { success: true, message: 'Password updated successfully.' };
  }
}
