import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const toLowerTrim = ({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
    @ApiProperty({ example: 'Ana Pérez' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @ApiProperty({ example: 'ana@mail.com' })
    @Transform(toLowerTrim)
    @IsEmail({}, { message: 'El email no es válido' })
    email: string;

    @ApiProperty({ example: 'Clave1234' })
    @IsString()
    @MinLength(8)
    @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
        message: 'La contraseña necesita al menos una mayúscula y un número',
    })
    password: string;
}

export class LoginDto {
    @ApiProperty({ example: 'ana@mail.com' })
    @Transform(toLowerTrim)
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Clave1234' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
