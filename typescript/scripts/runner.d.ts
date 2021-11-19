export interface  runnerScript{
  command: string , 
  next: () => void,
  done: () => void,
  code: number,
  err: string
}