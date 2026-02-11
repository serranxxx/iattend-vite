import { BiChurch, BiParty } from "react-icons/bi";
import { BsCalendar4Event, BsEnvelopeOpenHeart } from "react-icons/bs";
import { FaChildDress } from "react-icons/fa6";
import { LuBaby } from "react-icons/lu";

export const invitationsTypes = [
    {
        name: 'Boda',
        type: 'wedding',
        id: 1,
        icon: BsEnvelopeOpenHeart
    },
    {
        name: 'XV años',
        type: 'xv',
        id: 2,
        icon: FaChildDress
    },
    {
        name: 'Bautizo',
        type: 'bap',
        id: 3,
        icon: BiChurch
    },
    {
        name: 'Infantiles',
        type: 'kids',
        id: 4,
        icon: LuBaby
    },
    {
        name: 'Eventos',
        type: 'event',
        id: 5,
        icon: BsCalendar4Event,
    },
    {
        name: 'Fiestas',
        type: 'party',
        id: 6,
        icon: BiParty
    }
]

