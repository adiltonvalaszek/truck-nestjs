import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentStatusDto } from './dto/update-assignment-status.dto';
import { DriverLoadAssignment } from './entities/driver-load-assignment.entity';
import { AssignmentStatus } from './entities/driver-load-assignment.entity';

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let assignmentsService: AssignmentsService;

  const mockAssignmentsService = {
    create: jest.fn(),
    findById: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssignmentsController],
      providers: [
        {
          provide: AssignmentsService,
          useValue: mockAssignmentsService,
        },
      ],
    }).compile();

    controller = module.get<AssignmentsController>(AssignmentsController);
    assignmentsService = module.get<AssignmentsService>(AssignmentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an assignment successfully', async () => {
      const createAssignmentDto: CreateAssignmentDto = {
        driverId: 'driver-uuid-1',
        loadId: 'load-uuid-1',
      };

      const mockAssignment = {
        id: 'uuid-123',
        driverId: 'driver-uuid-1',
        loadId: 'load-uuid-1',
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        driver: null,
        load: null,
      } as DriverLoadAssignment;

      mockAssignmentsService.create.mockResolvedValue(mockAssignment);

      const result = await controller.create(createAssignmentDto);

      expect(assignmentsService.create).toHaveBeenCalledWith(createAssignmentDto);
      expect(result).toEqual(mockAssignment);
    });

    it('should handle service errors on create', async () => {
      const createAssignmentDto: CreateAssignmentDto = {
        driverId: 'driver-uuid-1',
        loadId: 'load-uuid-1',
      };

      mockAssignmentsService.create.mockRejectedValue(new Error('Driver not found'));

      await expect(controller.create(createAssignmentDto)).rejects.toThrow('Driver not found');
      expect(assignmentsService.create).toHaveBeenCalledWith(createAssignmentDto);
    });
  });

  describe('findOne', () => {
    it('should find an assignment by id', async () => {
      const assignmentId = 'uuid-123';
      const mockAssignment = {
        id: assignmentId,
        driverId: 'driver-uuid-1',
        loadId: 'load-uuid-1',
        status: AssignmentStatus.ASSIGNED,
        assignedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
        driver: null,
        load: null,
      } as DriverLoadAssignment;

      mockAssignmentsService.findById.mockResolvedValue(mockAssignment);

      const result = await controller.findOne(assignmentId);

      expect(assignmentsService.findById).toHaveBeenCalledWith(assignmentId);
      expect(result).toEqual(mockAssignment);
    });

    it('should handle not found assignment', async () => {
      const assignmentId = 'non-existent-id';

      mockAssignmentsService.findById.mockRejectedValue(new Error('Assignment not found'));

      await expect(controller.findOne(assignmentId)).rejects.toThrow('Assignment not found');
      expect(assignmentsService.findById).toHaveBeenCalledWith(assignmentId);
    });
  });

  describe('updateStatus', () => {
    it('should update assignment status successfully', async () => {
      const assignmentId = 'uuid-123';
      const updateDto: UpdateAssignmentStatusDto = {
        status: AssignmentStatus.COMPLETED,
      };

      const mockUpdatedAssignment = {
        id: assignmentId,
        driverId: 'driver-uuid-1',
        loadId: 'load-uuid-1',
        status: AssignmentStatus.COMPLETED,
        assignedAt: new Date(),
        completedAt: new Date(),
        driver: null,
        load: null,
      } as DriverLoadAssignment;

      mockAssignmentsService.updateStatus.mockResolvedValue(mockUpdatedAssignment);

      const result = await controller.updateStatus(assignmentId, updateDto);

      expect(assignmentsService.updateStatus).toHaveBeenCalledWith(assignmentId, updateDto);
      expect(result).toEqual(mockUpdatedAssignment);
    });

    it('should handle invalid status transition', async () => {
      const assignmentId = 'uuid-123';
      const updateDto: UpdateAssignmentStatusDto = {
        status: AssignmentStatus.ASSIGNED,
      };

      mockAssignmentsService.updateStatus.mockRejectedValue(
        new Error('Invalid status transition')
      );

      await expect(controller.updateStatus(assignmentId, updateDto)).rejects.toThrow(
        'Invalid status transition'
      );
      expect(assignmentsService.updateStatus).toHaveBeenCalledWith(assignmentId, updateDto);
    });

    it('should handle assignment not found on status update', async () => {
      const assignmentId = 'non-existent-id';
      const updateDto: UpdateAssignmentStatusDto = {
        status: AssignmentStatus.ASSIGNED,
      };

      mockAssignmentsService.updateStatus.mockRejectedValue(new Error('Assignment not found'));

      await expect(controller.updateStatus(assignmentId, updateDto)).rejects.toThrow(
        'Assignment not found'
      );
      expect(assignmentsService.updateStatus).toHaveBeenCalledWith(assignmentId, updateDto);
    });
  });
});