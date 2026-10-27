import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo:
    Repository<Product>,
    private readonly dataSource: DataSource
  ) {}

  create(dto: CreateProductDto, ownerId: string) {
    return this.productsRepo.save(this.productsRepo.create({ ...dto, ownerId }))
  }

  
}
