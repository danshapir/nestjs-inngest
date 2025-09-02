import { 
  Controller, 
  Post, 
  Put, 
  Delete, 
  Get, 
  Body, 
  Param, 
  Query,
  HttpException, 
  HttpStatus,
  Logger 
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../types';

interface CreateUserDto {
  email: string;
  name: string;
}

interface UpdateUserDto {
  email?: string;
  name?: string;
}

interface VerifyUserDto {
  verificationToken: string;
}

@Controller('users')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  /**
   * Create a new user
   * This will trigger the user onboarding workflow
   */
  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<{
    success: boolean;
    user: User;
    message: string;
  }> {
    try {
      this.logger.log(`📝 Creating new user: ${createUserDto.email}`);
      
      if (!createUserDto.email || !createUserDto.name) {
        throw new HttpException('Email and name are required', HttpStatus.BAD_REQUEST);
      }

      if (!this.isValidEmail(createUserDto.email)) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }

      if (createUserDto.name.length < 2 || createUserDto.name.length > 100) {
        throw new HttpException('Name must be between 2 and 100 characters', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.createUser(createUserDto);
      
      this.logger.log(`✅ User created successfully: ${user.id}`);
      
      return {
        success: true,
        user,
        message: 'User created successfully. Onboarding workflow has been started.',
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to create user: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to create user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Update an existing user
   * This will trigger the user update workflow
   */
  @Put(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<{
    success: boolean;
    user: User;
    message: string;
  }> {
    try {
      this.logger.log(`🔄 Updating user: ${userId}`);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!updateUserDto.email && !updateUserDto.name) {
        throw new HttpException('At least one field (email or name) must be provided', HttpStatus.BAD_REQUEST);
      }

      if (updateUserDto.email && !this.isValidEmail(updateUserDto.email)) {
        throw new HttpException('Invalid email format', HttpStatus.BAD_REQUEST);
      }

      if (updateUserDto.name && (updateUserDto.name.length < 2 || updateUserDto.name.length > 100)) {
        throw new HttpException('Name must be between 2 and 100 characters', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.updateUser(userId, updateUserDto);
      
      this.logger.log(`✅ User update triggered successfully: ${userId}`);
      
      return {
        success: true,
        user,
        message: 'User update workflow has been started. Changes will be applied shortly.',
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to update user: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to update user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Delete a user
   * This will trigger the user deletion event
   */
  @Delete(':id')
  async deleteUser(@Param('id') userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      this.logger.log(`🗑️ Deleting user: ${userId}`);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      await this.userService.deleteUser(userId);
      
      this.logger.log(`✅ User deleted successfully: ${userId}`);
      
      return {
        success: true,
        message: 'User deleted successfully.',
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to delete user: ${error.message}`);
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to delete user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get user details
   */
  @Get(':id')
  async getUser(@Param('id') userId: string): Promise<{
    success: boolean;
    user: User | null;
  }> {
    try {
      this.logger.log(`👤 Getting user: ${userId}`);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.getUser(userId);
      
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      
      return {
        success: true,
        user,
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to get user: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Verify a user's email
   * This will trigger the user.verified event and complete onboarding
   */
  @Post(':id/verify')
  async verifyUser(
    @Param('id') userId: string,
    @Body() verifyUserDto: VerifyUserDto
  ): Promise<{
    success: boolean;
    user: User;
    message: string;
  }> {
    try {
      this.logger.log(`🔐 Verifying user: ${userId}`);
      
      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      if (!verifyUserDto.verificationToken) {
        throw new HttpException('Verification token is required', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userService.verifyUser(userId, verifyUserDto.verificationToken);
      
      this.logger.log(`✅ User verified successfully: ${userId}`);
      
      return {
        success: true,
        user,
        message: 'User verified successfully. Onboarding will be completed.',
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to verify user: ${error.message}`);
      if (error.message.includes('not found')) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to verify user: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get all users (for debugging/testing)
   */
  @Get()
  async getAllUsers(): Promise<{
    success: boolean;
    users: User[];
    profiles: any[];
    count: number;
  }> {
    try {
      this.logger.log(`📋 Getting all users`);
      
      const users = this.userService.getAllUsers();
      const profiles = this.userService.getAllProfiles();
      
      return {
        success: true,
        users,
        profiles,
        count: users.length,
      };
      
    } catch (error) {
      this.logger.error(`❌ Failed to get all users: ${error.message}`);
      throw new HttpException(
        'Failed to get users: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}