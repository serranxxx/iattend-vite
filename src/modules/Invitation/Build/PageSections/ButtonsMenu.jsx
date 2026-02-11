
import { Tooltip } from 'antd';
// import { storage } from '../../firebase';
// import { ref,deleteObject } from 'firebase/storage';

export const ButtonsMenu = ({
     buttons, currentSection, handleClick, 
     setOnHide, invitation
}) => {

    const handleActions = (item) => {
        setOnHide(false)
        handleClick(item);
    }

    const sortButtons = (buttons, order) => {
        const fixed = buttons.filter(btn => btn.index === 0);
        const sortable = buttons.filter(btn => btn.index !== 0);
      
        sortable.sort(
          (a, b) => order.indexOf(a.index) - order.indexOf(b.index)
        );
      
        return [...fixed, ...sortable];
      };
      


    return (
        <div className={'tools-main-container'} style={{
        }}>
            <div className={'tools-container'}>

                {
                    sortButtons(buttons, invitation.generals.positions).map((item, index) => (
                        <Tooltip key={index} color={'var(--text-color)'} placement="bottomRight" title={item.name}>
                            <div
                                className={`single-button${currentSection === item.value ? '--selected' : ''} tag-button-tools`}
                                key={index}
                                onClick={() => handleActions(item)} >
                                {item.icon}
                                {/* {item.index} */}
                            </div>
                        </Tooltip>

                    ))
                }

            </div>

        </div>

    )
}
