using Microsoft.Extensions.Configuration;
using SistemaReservasBackend.DTOs;
using SistemaReservasBackend.Models;
using SistemaReservasBackend.Services;
using Xunit;

namespace SistemaReservasBackend.Tests;

public class ReservationValidationTests
{
    private readonly IConfiguration _config;

    public ReservationValidationTests()
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
    public async Task CrearReserva_ConDatosValidos_RetornaExitoYCodigo201()
    {
        // Arrange
        var service = new ReservationService(_config);
        var futureDate = DateTime.UtcNow.AddDays(5).Date.AddHours(14); // 14:00:00 exacto
        var dto = new CreateReservationDto
        {
            UserName = "Carlos Tevez",
            UserEmail = "carlos@boca.com",
            DateTime = futureDate.ToString("yyyy-MM-ddTHH:mm:ss.000Z")
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(201, statusCode);
        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.Equal("PENDIENTE", response.Data.Status);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task CrearReserva_ConNombreInvalido_FallaReglaR2(string? nombreInvalido)
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new CreateReservationDto
        {
            UserName = nombreInvalido,
            UserEmail = "test@example.com",
            DateTime = DateTime.UtcNow.AddDays(1).Date.AddHours(10).ToString("yyyy-MM-ddTHH:00:00.000Z")
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
        Assert.Equal("R2_INVALID_NAME", response.Code);
    }

    [Theory]
    [InlineData("usuario_sin_arroba")]
    [InlineData("usuario@")]
    [InlineData("@dominio.com")]
    [InlineData("usuario@dominio")]
    public async Task CrearReserva_ConEmailInvalido_FallaReglaR2(string emailInvalido)
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new CreateReservationDto
        {
            UserName = "Usuario Valido",
            UserEmail = emailInvalido,
            DateTime = DateTime.UtcNow.AddDays(1).Date.AddHours(10).ToString("yyyy-MM-ddTHH:00:00.000Z")
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
        Assert.Equal("R2_INVALID_EMAIL", response.Code);
    }

    [Fact]
    public async Task CrearReserva_ConFechaPasada_FallaReglaR1()
    {
        // Arrange: Una fecha en el pasado
        var service = new ReservationService(_config);
        var pastDate = DateTime.UtcNow.AddDays(-1).ToString("yyyy-MM-ddTHH:00:00.000Z");
        var dto = new CreateReservationDto
        {
            UserName = "Juan Pasado",
            UserEmail = "juan@pasado.com",
            DateTime = pastDate
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
        Assert.Equal("R1_PAST_DATE", response.Code);
    }

    [Fact]
    public async Task CrearReserva_ConIntervaloFueraDe30Minutos_FallaReglaR1()
    {
        // Arrange: 10:15 no es múltiplo de 30 minutos
        var service = new ReservationService(_config);
        var invalidInterval = DateTime.UtcNow.AddDays(1).Date.AddHours(10).AddMinutes(15).ToString("yyyy-MM-ddTHH:mm:00.000Z");
        var dto = new CreateReservationDto
        {
            UserName = "Martin Palermo",
            UserEmail = "martin@goles.com",
            DateTime = invalidInterval
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
        Assert.Equal("R1_INVALID_INTERVAL", response.Code);
    }

    [Fact]
    public async Task CrearReserva_ConSolapamientoDeHorario_FallaReglaR3()
    {
        // Arrange: MockReservations tiene una reserva fija para AddDays(1) a las HH:30
        var service = new ReservationService(_config);
        var overlapDate = DateTime.UtcNow.AddDays(1).ToString("yyyy-MM-ddTHH:30:00.000Z");
        var dto = new CreateReservationDto
        {
            UserName = "Otro Usuario",
            UserEmail = "otro@example.com",
            DateTime = overlapDate
        };

        // Act
        var (statusCode, response) = await service.CreateReservationAsync(dto);

        // Assert
        Assert.Equal(409, statusCode);
        Assert.False(response.Success);
        Assert.Equal("R3_SCHEDULE_OVERLAP", response.Code);
    }

    [Fact]
    public async Task ActualizarEstado_AEstadoVacio_FallaValidacion()
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new UpdateStatusDto { NewStatus = "" };

        // Act
        var (statusCode, response) = await service.UpdateStatusAsync(1, dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
    }

    [Fact]
    public async Task ActualizarEstado_ReservaInexistente_Retorna404()
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new UpdateStatusDto { NewStatus = "CONFIRMADO" };

        // Act
        var (statusCode, response) = await service.UpdateStatusAsync(99999, dto);

        // Assert
        Assert.Equal(404, statusCode);
        Assert.False(response.Success);
    }

    [Fact]
    public async Task ObtenerReservas_RetornaListaDeReservasYCodigo200()
    {
        // Arrange
        var service = new ReservationService(_config);

        // Act
        var (statusCode, response) = await service.GetReservationsAsync();

        // Assert
        Assert.Equal(200, statusCode);
        Assert.True(response.Success);
        Assert.NotNull(response.Data);
    }

    [Fact]
    public async Task ActualizarEstado_AEstadoInvalido_Retorna400()
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new UpdateStatusDto { NewStatus = "ESTADO_INEXISTENTE" };

        // Act
        var (statusCode, response) = await service.UpdateStatusAsync(1, dto);

        // Assert
        Assert.Equal(400, statusCode);
        Assert.False(response.Success);
        Assert.Equal("INVALID_STATUS", response.Code);
    }

    [Fact]
    public async Task ActualizarEstado_ConfirmarReserva_Retorna200()
    {
        // Arrange
        var service = new ReservationService(_config);
        var dto = new UpdateStatusDto { NewStatus = "CONFIRMADO" };

        // Act
        var (statusCode, response) = await service.UpdateStatusAsync(2, dto);

        // Assert
        Assert.Equal(200, statusCode);
        Assert.True(response.Success);
        Assert.Equal("CONFIRMADO", response.Data?.Status);
    }

    [Fact]
    public async Task ActualizarEstado_CancelarReservaConAnticipacion_Retorna200()
    {
        // Arrange: Creamos primero una reserva para dentro de 5 días
        var service = new ReservationService(_config);
        var futureDate = DateTime.UtcNow.AddDays(5).Date.AddHours(10);
        var createDto = new CreateReservationDto
        {
            UserName = "Usuario Cancelable",
            UserEmail = "cancel@test.com",
            DateTime = futureDate.ToString("yyyy-MM-ddTHH:00:00.000Z")
        };
        var (_, createRes) = await service.CreateReservationAsync(createDto);
        var createdId = createRes.Data!.Id;

        // Act: La cancelamos
        var cancelDto = new UpdateStatusDto { NewStatus = "CANCELADO" };
        var (statusCode, cancelRes) = await service.UpdateStatusAsync(createdId, cancelDto);

        // Assert
        Assert.Equal(200, statusCode);
        Assert.True(cancelRes.Success);
        Assert.Equal("CANCELADO", cancelRes.Data?.Status);
    }

    [Fact]
    public async Task ActualizarEstado_CambiarEstadoDeReservaYaCancelada_FallaReglaR4()
    {
        // Arrange: Creamos y cancelamos una reserva
        var service = new ReservationService(_config);
        var futureDate = DateTime.UtcNow.AddDays(6).Date.AddHours(10);
        var createDto = new CreateReservationDto
        {
            UserName = "Usuario R4",
            UserEmail = "r4@test.com",
            DateTime = futureDate.ToString("yyyy-MM-ddTHH:00:00.000Z")
        };
        var (_, createRes) = await service.CreateReservationAsync(createDto);
        var createdId = createRes.Data!.Id;
        await service.UpdateStatusAsync(createdId, new UpdateStatusDto { NewStatus = "CANCELADO" });

        // Act: Intentamos reactivarla/confirmarla
        var (statusCode, reactivateRes) = await service.UpdateStatusAsync(createdId, new UpdateStatusDto { NewStatus = "CONFIRMADO" });

        // Assert: Regla R4 bloquea la transición
        Assert.Equal(400, statusCode);
        Assert.False(reactivateRes.Success);
        Assert.Equal("R4_FORBIDDEN_TRANSITION", reactivateRes.Code);
    }
}
