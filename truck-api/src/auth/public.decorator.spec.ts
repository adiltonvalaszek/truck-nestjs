import { SetMetadata } from '@nestjs/common';
import { Public, IS_PUBLIC_KEY } from './public.decorator';

jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('Public Decorator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Public).toBeDefined();
    expect(IS_PUBLIC_KEY).toBeDefined();
  });

  it('should call SetMetadata with correct parameters', () => {
    const mockSetMetadata = SetMetadata as jest.Mock;
    mockSetMetadata.mockReturnValue('mock-decorator');

    const decorator = Public();

    expect(SetMetadata).toHaveBeenCalledWith(IS_PUBLIC_KEY, true);
    expect(decorator).toBe('mock-decorator');
  });

  it('should have correct IS_PUBLIC_KEY value', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});