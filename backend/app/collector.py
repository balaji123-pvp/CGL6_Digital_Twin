class SimulatedCollector:
    source = "SIMULATED / INTERPOLATED"

    def quality(self):
        return {"source": self.source, "quality": "SIMULATED"}

# Future:
# class OpcUaCollector:
#     read normalized CGL tags from the approved plant OPC UA gateway.
# Do not connect directly to a safety/control network without an approved
# industrial cyber-security architecture.
