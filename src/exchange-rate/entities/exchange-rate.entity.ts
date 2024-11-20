import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";


@Schema()
export class ExchangeRate {
    @Prop({required: true})
    designation: String;
    @Prop({required: true})
    code: String;
    @Prop({required: true})
    unit: String;
    @Prop({required: true})
    buyingRate: String;
    @Prop({required: true})
    sellingRate: String;
    @Prop({ type: Date, default: Date.now })
    date: Date;
}

export const exchangeRateShcema=SchemaFactory.createForClass(ExchangeRate);

