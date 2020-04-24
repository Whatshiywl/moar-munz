import { Pipe, PipeTransform } from '@angular/core';
import * as color from 'color';

/*
* Lightens a color
*/
@Pipe({name: 'lighten'})
export class LightenPipe implements PipeTransform {
    transform(col: string, percentage?: number): string {
        percentage = percentage || 0.1;
        const original = color(col).hex();
        const result = color(col).lighten(percentage).hex();
        if (col.includes('green')) console.log(col, original, '=>', result);
        return result;
    }
}