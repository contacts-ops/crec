import {EditablePropProps} from "@/types/editable-prop";


export const EditableProp = ({ id, label, type, children }: EditablePropProps) => (
    <div className="hidden"
         data-editable="true"
         data-id={id}
         data-label={label}
         {...(type ? { "data-type": type } : {})}>
        {children}
    </div>
);
