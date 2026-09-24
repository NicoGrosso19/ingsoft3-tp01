using System.Diagnostics.CodeAnalysis;

namespace SistemaReservasBackend.Services;

public interface INotificationService
{
    Task NotifyReservationCreatedAsync(string email, string userName, string dateTime);
}

[ExcludeFromCodeCoverage]
public class EmailNotificationService : INotificationService
{
    public Task NotifyReservationCreatedAsync(string email, string userName, string dateTime)
    {
        // En producción enviaría un correo real.
        // Se aísla mediante Mock en los tests unitarios.
        return Task.CompletedTask;
    }
}
