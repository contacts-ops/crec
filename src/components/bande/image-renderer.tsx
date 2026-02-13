import Image from "next/image";
import {EditableProp} from "@/components/bande/editable-prop";

interface ImageRendererProps {
    id: string;
    className?: string;
    mediaUrl: string;
    mediaAlt?: string;
    width: number;
    height: number;
    label?: string | number;
}

export const ImageRenderer = ({id, className, mediaUrl, mediaAlt, width, height, label}: ImageRendererProps) => {
    if (!mediaUrl) return null;

    return (
        <>
            <EditableProp id={id} label={'Image ' + label} type={'media'}>
                {mediaUrl}
            </EditableProp>
            <Image className={className} src={mediaUrl} alt={mediaAlt || ""} height={height} width={width}/>
        </>
    )
};
