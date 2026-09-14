// The gateway supplies a mount-aware base; direct Pages and development use /.
export function artUrl(file:string):string {return new URL(`art/${file}`,document.baseURI).href;}
