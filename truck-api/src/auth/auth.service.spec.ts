import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      validatePassword: jest.fn(),
      create: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'plain-password',
    };

    it('should return access token when credentials are valid', async () => {
      // Mock user found
      usersService.findByEmail.mockResolvedValue(mockUser);
      
      // Mock password validation success
      usersService.validatePassword.mockResolvedValue(true);
      
      // Mock JWT token generation
      const mockAccessToken = 'jwt.token.here';
      jwtService.signAsync.mockResolvedValue(mockAccessToken);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        access_token: mockAccessToken,
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
        },
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Mock user not found
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Mock user found
      usersService.findByEmail.mockResolvedValue(mockUser);
      
      // Mock password validation failure
      usersService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should handle errors from user service', async () => {
      // Mock user service error
      const serviceError = new Error('Database connection failed');
      usersService.findByEmail.mockRejectedValue(serviceError);

      await expect(service.login(loginDto)).rejects.toThrow(serviceError);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).not.toHaveBeenCalled();
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    const payload = {
      sub: 'user-1',
      email: 'test@example.com',
    };

    it('should return user when payload is valid', async () => {
      usersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload.sub);

      expect(result).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockUser.createdAt,
      });

      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('should return null when user not found', async () => {
      usersService.findById.mockResolvedValue(null);

      const result = await service.validateUser(payload.sub);

      expect(result).toBeNull();
      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
    });

    it('should handle errors from user service gracefully', async () => {
      const serviceError = new Error('Database connection failed');
      usersService.findById.mockRejectedValue(serviceError);

      await expect(service.validateUser(payload.sub)).rejects.toThrow(serviceError);

      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
    });
  });
});