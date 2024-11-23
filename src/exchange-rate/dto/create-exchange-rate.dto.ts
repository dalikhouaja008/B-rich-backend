import { IsDate, IsString } from "class-validator";

export class CreateExchangeRateDto {

    @IsString()
    designation: String;
    @IsString()
    code: String;
    @IsString()
    unit: String;
    @IsString()
    buyingRate: String;
    @IsString()
    sellingRate: String;
    @IsString()
    date: Date;
}
