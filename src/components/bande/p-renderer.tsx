import {EditablePropProps} from "@/types/editable-prop";
import {CSSProperties} from "react";

interface PRenderer extends EditablePropProps {
    style?: CSSProperties;
    className?: string;
    paragraphe: string;
}


const PRenderer = ({id, label, paragraphe, style, className}: PRenderer) => {
    return (
        <p
            data-editable="true"
            data-id={id}
            data-label={label}
            style={style}
            className={className}
        >
            {paragraphe}
        </p>
    );
};

export default PRenderer;