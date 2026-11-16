import { t } from '../managers/LanguageManager.js';
import { STORY } from './gameConfig.js';

/**
 * Contenido narrativo. Los dialogos son fijos, lineales y sin ramificaciones.
 * {victimName} se reemplaza por STORY.victimFullName durante la ejecucion.
 */

export const SPEAKERS = Object.freeze({
    roro: {
        name: STORY.playerName,
        portraitKey: 'portrait-roro',
        nameColor: '#e8b48a'
    },
    detective: {
        name: STORY.detectiveName,
        portraitKey: 'portrait-detective',
        nameColor: '#8fb3ff'
    }
});

/** Lineas mostradas por IntroductionScene en su orden de aparicion. */
export const INTRODUCTION = [
    { text: `For ${STORY.monthsWithBlackouts} months, Roro has been waking up with no memory of the night before.` },
    { text: 'Every month there is something new.\nBloodied clothes. Things that belong to strangers. A weapon.\nA note with a name on it.' },
    { text: 'Roro has learned a routine.\nFind everything. Hide everything. Forget.' },
    { text: 'This is the sixth month.\nAnd this time, someone knocks before the routine is finished.' },
    { text: 'KNOCK. KNOCK. KNOCK.', knock: true, emphasis: true },
    { text: '"Police! We are investigating a death in the building.\nPlease open the door."', speaker: 'detective' },
    { text: 'Roro opens the door.\nThe detective steps inside and starts looking around.' },
    { text: 'Find the six pieces of evidence and hide them\nbefore the detective finds them.', emphasis: true }
];

/**
 * Tres entrevistas, una tras cada una de las tres primeras rondas:
 * 1. El arma. 2. Las pertenencias de la victima. 3. El nombre de la victima.
 */
export const INTERVIEWS = [
    {
        id: 'interviewWeapon',
        title: 'First interview',
        lines: [
            { speaker: 'detective', text: 'Sorry to interrupt. Just a few questions.' },
            { speaker: 'detective', text: 'The victim was struck several times with something heavy. Something made of wood, we think.' },
            { speaker: 'detective', text: 'The coroner says it was long and round. Like a baseball bat.' },
            { speaker: 'roro', text: 'I... don\'t play baseball.' },
            { speaker: 'detective', text: 'Nobody said you did. I\'ll keep looking around, if you don\'t mind.' }
        ]
    },
    {
        id: 'interviewBelongings',
        title: 'Second interview',
        lines: [
            { speaker: 'detective', text: 'Some of the victim\'s things are missing from their apartment.' },
            { speaker: 'detective', text: 'A desk globe. A blue lamp. Some star ornaments. A framed map of the city.' },
            { speaker: 'detective', text: 'Odd things to steal, don\'t you think?' },
            { speaker: 'roro', text: 'Maybe they just... lost them.' },
            { speaker: 'detective', text: 'Maybe. Let\'s see what else turns up.' }
        ]
    },
    {
        id: 'interviewName',
        title: 'Third interview',
        lines: [
            { speaker: 'detective', text: 'One more thing. I should have told you the victim\'s name.' },
            { speaker: 'detective', text: 'Their name was {victimName}.' },
            { speaker: 'detective', text: 'Does that name mean anything to you?' },
            { speaker: 'roro', text: '...No. I\'ve never heard it before.' },
            { speaker: 'detective', text: 'Funny. You hesitated. I\'ll finish up and get out of your way.' }
        ]
    }
];

/** Sustituye marcadores narrativos como {victimName} dentro de un texto. */
export function formatStoryText(text) {
    return t(text).replaceAll('{victimName}', STORY.victimFullName);
}
