import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'test@example.com',
    password: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      name: 'John Doe',
      email: 'newuser@example.com',
      password: 'plain-password',
    };

    it('should create user with hashed password', async () => {
      const hashedPassword = 'hashed-plain-password';
      mockBcrypt.hash.mockResolvedValue(hashedPassword as never);

      const createdUser = {
        id: 'user-2',
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        createdAt: new Date(),
      };

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(createdUser as any);
      userRepository.save.mockResolvedValue(createdUser as any);

      const result = await service.create(createUserDto);

      expect(result).toEqual({
        id: 'user-2',
        name: createUserDto.name,
        email: createUserDto.email,
        createdAt: expect.any(Date),
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
      });
      expect(userRepository.save).toHaveBeenCalledWith(createdUser);
    });

    it('should throw ConflictException when email already exists', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.create(createUserDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createUserDto)).rejects.toThrow('Email already exists');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle bcrypt hashing errors', async () => {
      const hashError = new Error('Bcrypt hashing failed');
      userRepository.findOne.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(hashError as never);

      await expect(service.create(createUserDto)).rejects.toThrow(hashError);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'nonexistent@example.com' },
      });
    });
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const userWithoutPassword = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      };
      userRepository.findOne.mockResolvedValue(userWithoutPassword as any);

      const result = await service.findById('user-1');

      expect(result).toEqual(userWithoutPassword);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: ['id', 'name', 'email', 'createdAt'],
      });
    });

    it('should return null when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        select: ['id', 'name', 'email', 'createdAt'],
      });
    });
  });

  describe('validatePassword', () => {
    it('should return true when password matches', async () => {
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.validatePassword('plain-password', 'hashed-password');

      expect(result).toBe(true);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password');
    });

    it('should return false when password does not match', async () => {
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.validatePassword('wrong-password', 'hashed-password');

      expect(result).toBe(false);
      expect(mockBcrypt.compare).toHaveBeenCalledWith('wrong-password', 'hashed-password');
    });

    it('should handle bcrypt comparison errors', async () => {
      const compareError = new Error('Bcrypt comparison failed');
      mockBcrypt.compare.mockRejectedValue(compareError as never);

      await expect(
        service.validatePassword('plain-password', 'hashed-password'),
      ).rejects.toThrow(compareError);

      expect(mockBcrypt.compare).toHaveBeenCalledWith('plain-password', 'hashed-password');
    });
  });
});