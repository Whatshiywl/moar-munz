import { Pipe, PipeTransform } from '@angular/core';
import * as color from 'color';

/*
* Lightens a color
*/
@Pipe({name: 'lighten'})
export class LightenPipe implements PipeTransform {
    transform(col: string, percentage?: number): string {
        percentage = percentage || 0.1;
        const result = color(col).lighten(percentage).hex();
        return result;
    }
}