import {EditableProp} from "@/components/bande/editable-prop";

interface BandeWrapperProps {
    primaryColor: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontFamily: string;
    fontFamilySecondary?: string;
    children: React.ReactNode;
}

const BandeWrapper = ({
                          primaryColor,
                          secondaryColor,
                          backgroundColor,
                          fontFamily,
                          fontFamilySecondary,
                          children,
                      }: BandeWrapperProps) => {
    return (
        <>
            <EditableProp id={'-primaryColor'} label={'Couleur Primaire'}>{primaryColor}</EditableProp>
            {secondaryColor &&
                <EditableProp id={'-secondaryColor'} label={'Couleur Secondaire'}>{secondaryColor}</EditableProp>}
            {backgroundColor &&
                <EditableProp id={'-backgroundColor'} label={'Couleur de background'}>{backgroundColor}</EditableProp>}

            <EditableProp id={'-fontFamily'} label={'Font'} type={'font'}>{fontFamily}</EditableProp>
            {fontFamilySecondary &&
                <EditableProp id={'-fontFamilySecondary'} label={'Font secondaire'}>{fontFamilySecondary}</EditableProp>}

            {children}
        </>
    );
};

export default BandeWrapper;