import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseUUIDPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { Auth } from '../../common/decorators/auth.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) {}

    @Auth()
    @Post()
    create(@Body() dto: CreateProductDto, @CurrentUser('sub') userId: string) {
        return this.productsService.create(dto, userId)
    }

    @Public()
    @Get()
    findAll(@Query() query: QueryProductDto) {
        return this.productsService.findAll(query)
    }

    @Public()
    @Get(':id')
    findOne(@Param('id', ParseUUIDPipe) id: string) {
        return this.productsService.findOne(id)
    }

    @Auth()
    @Patch(':id')
    update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateProductDto,
        @CurrentUser() user: JwtPayload
    ) {
        return this.productsService.update(id, dto, user)
    }

    @Auth()
    @Delete(':id')
    remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
        return this.productsService.remove(id, user)
    }
}
