export function ApiPaginatedResponse<T>(
  model: new () => T,
  description?: string
): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // This decorator can be used with @nestjs/swagger for API documentation
    // For now, it's a placeholder that can be enhanced with actual Swagger decorators
  };
}