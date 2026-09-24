using Microsoft.Extensions.Configuration;
using Moq;
using SistemaReservasBackend.DTOs;
using SistemaReservasBackend.Services;
using Xunit;

namespace SistemaReservasBackend.Tests;

public class ReservationServiceMockTests
{
    private readonly IConfiguration _config;

    public ReservationServiceMockTests()
    {
        var myConfiguration = new Dictionary<string, string?>
        {
            {"ConnectionStrings:Default", "Host=invalid_host;Database=invalid;Username=invalid;Password=invalid;Timeout=1"}
        };

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(myConfiguration)
            .Build();
    }

    [Fact]
    public async Task CrearReservaValida_InvocaNotificadorUnaSolaVez()
    {
        // Arrange: Fabricamos el Mock del servicio de notificaciones con Moq
        var mockNotifier = new Mock<INotificationService>();
        
        // Configuramos el mock para que complete la tarea exitosamente
        mockNotifier
            .Setup(n => n.NotifyReservationCreatedAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Inyectamos el Mock en el servicio real bajo prueba
        var service = new ReservationService(_config, mockNotifier.Object);

        var futureDate = DateTime.UtcNow.AddDays(10).Date.AddHours(16);
        var dto = new CreateReservationDto
        {
            UserName = "Lionel Messi",
            UserEmail = "leo@intermiami.com",
            DateTime = futureDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z")
        };

        // Act: Ejecutamos la acción
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert: Verificamos no solo el estado devuelto sino la INTERACCIÓN con la dependencia externa
        Assert.Equal(201, statusCode);
        Assert.True(response.Success);

        // Comprobamos que el servicio de email haya sido llamado EXACTAMENTE una vez con los parámetros esperados
        mockNotifier.Verify(
            n => n.NotifyReservationCreatedAsync(dto.UserEmail, dto.UserName, It.IsAny<string>()),
            Times.Once,
            "El sistema debió notificar al usuario por email exactamente una vez."
        );
    }
}
