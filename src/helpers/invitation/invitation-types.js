import { BiChurch, BiParty } from "react-icons/bi";
import { BsCalendar4Event, BsEnvelopeOpenHeart } from "react-icons/bs";
import { FaChildDress } from "react-icons/fa6";
import { LuBaby,  LuCalendar,  LuCalendarCheck2, LuCalendarClock, LuCalendarDays, LuCalendarHeart, LuPartyPopper } from "react-icons/lu";
import { PiDress } from "react-icons/pi";

export const invitationsTypes = [
    {
        name: 'Boda',
        type: 'wedding',
        id: 1,
        icon: LuCalendarHeart
    },
    {
        name: 'XV años',
        type: 'xv',
        id: 2,
        icon: PiDress,
    },
    // {
    //     name: 'Bautizo',
    //     type: 'bap',
    //     id: 3,
    //     icon: LuCalendarDays
    // },
    {
        name: 'Infantiles',
        type: 'kids',
        id: 4,
        icon: LuPartyPopper
    },
    {
        name: 'Eventos',
        type: 'event',
        id: 5,
        icon: LuCalendar,
    },
    // {
    //     name: 'Fiestas',
    //     type: 'party',
    //     id: 6,
    //     icon: LuCalendarClock,
    // }
]

