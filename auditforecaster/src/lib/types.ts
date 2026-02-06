export type ActionResult = {
  success: boolean
  message: string
  errors?: Array<{ message: string; path?: string[] }>
}
