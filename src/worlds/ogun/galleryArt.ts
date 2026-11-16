/**
 * O6b: every piece of the Ogun part's art the debug galleries show (src/art/gallery*.ts), in one
 * module. The galleries import only this module, so the art files stay plain parts of the Ogun
 * part (its streets, hall, city, road and lane use them) and the build needs no extra shared chunk
 * for their module objects.
 */
export * from './city';
export * from './places';
export * from './road';
export * from './expressway';
export * from './ota';
export * from './sagamu';
export * from './hall';
