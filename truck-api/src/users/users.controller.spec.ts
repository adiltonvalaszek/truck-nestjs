import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUsersService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Definition', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(UsersController);
    });
  });

  describe('create', () => {
    describe('Success Cases', () => {
      it('should create a user successfully', async () => {
        // Arrange
        const createUserDto: CreateUserDto = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        };
        const expectedUser: User = {
          id: '1',
          name: createUserDto.name,
          email: createUserDto.email,
          password: 'hashed_password',
          createdAt: new Date(),
        };

        usersService.create.mockResolvedValue(expectedUser);

        // Act
        const result = await controller.create(createUserDto);

        // Assert
        expect(usersService.create).toHaveBeenCalledWith(createUserDto);
        expect(usersService.create).toHaveBeenCalledTimes(1);
        expect(result).toEqual(expectedUser);
        expect(result.email).toContain('@');
      });

    });

    describe('Error Cases', () => {
      it('should handle duplicate email error', async () => {
        // Arrange
        const createUserDto: CreateUserDto = {
          name: 'Test User',
          email: 'existing@example.com',
          password: 'password123',
        };
        const duplicateError = new ConflictException('Email already exists');

        usersService.create.mockRejectedValue(duplicateError);

        // Act & Assert
        await expect(controller.create(createUserDto)).rejects.toThrow('Email already exists');
        
        expect(usersService.create).toHaveBeenCalledWith(createUserDto);
        expect(usersService.create).toHaveBeenCalledTimes(1);
      });

      it('should handle validation errors', async () => {
        // Arrange
        const invalidUserDto: CreateUserDto = {
          name: '',
          email: 'invalid-email',
          password: '123',
        };
        const validationError = new Error('Validation failed');

        usersService.create.mockRejectedValue(validationError);

        // Act & Assert
        await expect(controller.create(invalidUserDto)).rejects.toThrow('Validation failed');
        
        expect(usersService.create).toHaveBeenCalledWith(invalidUserDto);
        expect(usersService.create).toHaveBeenCalledTimes(1);
      });

      it('should handle unexpected service errors', async () => {
        // Arrange
        const createUserDto: CreateUserDto = {
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        };
        const unexpectedError = new Error('Unexpected database error');

        usersService.create.mockRejectedValue(unexpectedError);

        // Act & Assert
        await expect(controller.create(createUserDto)).rejects.toThrow('Unexpected database error');
        
        expect(usersService.create).toHaveBeenCalledWith(createUserDto);
      });
    });

    describe('Edge Cases', () => {
      it('should handle special characters in user data', async () => {
        // Arrange
        const createUserDto: CreateUserDto = {
          name: 'José María O\'Connor',
          email: 'jose.maria@test-domain.co.uk',
          password: 'password123',
        };
        const expectedUser: User = {
          id: '1',
          name: createUserDto.name,
          email: createUserDto.email,
          password: 'hashed_password',
          createdAt: new Date(),
        };

        usersService.create.mockResolvedValue(expectedUser);

        // Act
        const result = await controller.create(createUserDto);

        // Assert
        expect(result.name).toBe(createUserDto.name);
        expect(result.email).toContain('@');
      });
    });
  });
});