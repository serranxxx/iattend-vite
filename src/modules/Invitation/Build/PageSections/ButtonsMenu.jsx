
import { Grid, Tooltip } from 'antd';

const { useBreakpoint } = Grid;

export const ButtonsMenu = ({
     buttons, currentSection, handleClick,
     setOnHide, menuTimerRef, invitation, staleSections
}) => {

    const screens = useBreakpoint();

    const handleActions = (item) => {
        handleClick(item);
        if (screens.xs) {
            if (menuTimerRef.current) clearTimeout(menuTimerRef.current);
            setOnHide(true);
            menuTimerRef.current = setTimeout(() => {
                setOnHide(false);
                menuTimerRef.current = null;
            }, 350);
        } else {
            setOnHide(false);
        }
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
                    sortButtons(buttons, invitation.generals.positions).map((item, index) => {
                        const btn = (
                            <div
                                key={index}
                                style={{ position: 'relative' }}
                                className={`single-button${currentSection === item.value ? '--selected' : ''} tag-button-tools`}
                                onClick={() => handleActions(item)} >
                                {item.icon}
                                {staleSections?.has(item.type) && (
                                    <span style={{
                                        position: 'absolute', top: '2px', right: '2px',
                                        width: '7px', height: '7px', borderRadius: '50%',
                                        backgroundColor: '#faad14',
                                    }} />
                                )}
                            </div>
                        );

                        return screens.xs ? btn : (
                            <Tooltip key={index} color={'var(--text-color)'} placement="bottomRight" title={item.name}>
                                {btn}
                            </Tooltip>
                        );
                    })
                }

            </div>

        </div>

    )
}
