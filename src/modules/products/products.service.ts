import {
    BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { QueryProductDto } from './dto/query-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
        private readonly dataSource: DataSource,
    ) { }

    create(dto: CreateProductDto, ownerId: string) {
        return this.productsRepo.save(this.productsRepo.create({ ...dto, ownerId }));
    }

    async findAll({ page, limit, search }: QueryProductDto) {
        const [items, total] = await this.productsRepo.findAndCount({
            where: search ? { name: ILike(`%${search}%`) } : {},
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });
        return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }

    async findOne(id: string) {
        const product = await this.productsRepo.findOne({ where: { id }, relations: { owner: true } });
        if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
        return product;
    }

    async update(id: string, dto: UpdateProductDto, user: JwtPayload) {
        const product = await this.findOne(id);
        this.assertOwner(product, user);
        Object.assign(product, dto);
        return this.productsRepo.save(product);
    }

    async remove(id: string, user: JwtPayload) {
        const product = await this.findOne(id);
        this.assertOwner(product, user);
        await this.productsRepo.softDelete(id);
        return { id, deleted: true };
    }

    // Transacción: si algo falla adentro, no se guarda nada
    decreaseStock(id: string, quantity: number) {
        return this.dataSource.transaction(async (manager) => {
            const product = await manager.findOne(Product, {
                where: { id },
                lock: { mode: 'pessimistic_write' },
            });
            if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
            if (product.stock < quantity) throw new BadRequestException('Stock insuficiente');
            product.stock -= quantity;
            return manager.save(product);
        });
    }

    private assertOwner(product: Product, user: JwtPayload) {
        if (user.role !== Role.ADMIN && product.ownerId !== user.sub) {
            throw new ForbiddenException('Solo el dueño o un admin puede modificar este producto');
        }
    }
}