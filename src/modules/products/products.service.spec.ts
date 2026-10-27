import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { DataSource } from 'typeorm';

describe('ProductsService', async () => {
    let service: ProductsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ProductsService],
        }).compile();

        service = module.get<ProductsService>(ProductsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    const repo = {
        findOne: vi.fn(),
        findAndCount: vi.fn(),
        save: vi.fn(),
        create: vi.fn((data) => data),
        softDelete: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
        providers: [
            ProductsService,
            { provide: getRepositoryToken(Product), useValue: repo }, // de @nestjs/typeorm
            { provide: DataSource, useValue: {} },
        ],
    }).compile();
});
