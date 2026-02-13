import { IPage } from '@/lib/models/Page';
import { IBande } from '@/lib/models/Bande';
import { WithPopulated } from '@/lib/models/types/utils';
import { IAbstractBande } from '../AbstractBande';

export type IPagePopulated = WithPopulated<IPage, 'bandes', IBandePopulated[]>;
export type IBandePopulated = WithPopulated<IBande, 'abstractBandeId', IAbstractBande>;
